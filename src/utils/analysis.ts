import * as XLSX from 'xlsx';
import { differenceInMinutes, isValid, format, getYear, getQuarter, getISOWeek } from 'date-fns';
import { Meeting, AnalysisResult, TrendData } from '../types';

export const parseExcelFile = (file: File): Promise<Meeting[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          reject(new Error('File is empty or invalid format'));
          return;
        }

        const headers = (jsonData[0] as string[]).map(h => h?.toString().toLowerCase().trim());
        
        const colMap = {
          userId: headers.findIndex(h => h.includes('user') || h.includes('id') || h.includes('用户') || h.includes('创建者')),
          startTime: headers.findIndex(h => h.includes('start') || h.includes('begin') || h.includes('开始')),
          endTime: headers.findIndex(h => h.includes('end') || h.includes('finish') || h.includes('结束')),
          participants: headers.findIndex(h => h.includes('participant') || h.includes('count') || h.includes('人数') || h.includes('方数') || h.includes('参会')),
          meetingId: headers.findIndex(h => h.includes('meeting') || h.includes('会议号') || h.includes('会议id')),
          subject: headers.findIndex(h => h.includes('subject') || h.includes('topic') || h.includes('主题')),
        };

        if (colMap.userId === -1 || colMap.startTime === -1 || colMap.endTime === -1) {
          reject(new Error('Could not identify required columns: User ID, Start Time, End Time. Please ensure headers are clear.'));
          return;
        }

        const meetings: Meeting[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;

          const userId = row[colMap.userId]?.toString() || 'Unknown';
          let startTime = row[colMap.startTime];
          let endTime = row[colMap.endTime];
          
          if (!(startTime instanceof Date)) {
             startTime = new Date(startTime);
          }
          if (!(endTime instanceof Date)) {
             endTime = new Date(endTime);
          }

          if (!isValid(startTime) || !isValid(endTime)) continue;

          const durationMinutes = differenceInMinutes(endTime, startTime);
          
          let participantCount = 0;
          if (colMap.participants !== -1) {
            participantCount = parseInt(row[colMap.participants]) || 0;
          }

          meetings.push({
            userId,
            startTime,
            endTime,
            durationMinutes,
            participantCount,
            meetingId: colMap.meetingId !== -1 ? row[colMap.meetingId]?.toString() : undefined,
            subject: colMap.subject !== -1 ? row[colMap.subject]?.toString() : undefined,
          });
        }

        resolve(meetings);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

const calculateTrends = (meetings: Meeting[], type: 'week' | 'month' | 'quarter'): TrendData[] => {
  const groups = new Map<string, { 
    allCreators: Set<string>; 
    advancedCreators: Set<string>;
    sortKey: number;
    label: string;
  }>();

  meetings.forEach(m => {
    let key = '';
    let sortKey = 0;
    let label = '';
    const date = m.startTime;

    if (type === 'week') {
      const year = getYear(date);
      const week = getISOWeek(date);
      key = `${year}-W${week.toString().padStart(2, '0')}`;
      sortKey = year * 100 + week;
      label = `${year}年第${week}周`;
    } else if (type === 'month') {
      key = format(date, 'yyyy-MM');
      sortKey = parseInt(format(date, 'yyyyMM'));
      label = format(date, 'yyyy年M月');
    } else {
      const year = getYear(date);
      const q = getQuarter(date);
      key = `${year}-Q${q}`;
      sortKey = year * 10 + q;
      label = `${year}年Q${q}`;
    }

    if (!groups.has(key)) {
      groups.set(key, { 
        allCreators: new Set(), 
        advancedCreators: new Set(),
        sortKey,
        label
      });
    }

    const group = groups.get(key)!;
    group.allCreators.add(m.userId);

    if (m.durationMinutes > 40 || m.participantCount > 100) {
      group.advancedCreators.add(m.userId);
    }
  });

  const sortedGroups = Array.from(groups.values()).sort((a, b) => a.sortKey - b.sortKey);
  const seenAdvancedCreators = new Set<string>();

  return sortedGroups.map(g => {
    const newAdvancedInPeriod = new Set<string>();
    g.advancedCreators.forEach(userId => {
      if (!seenAdvancedCreators.has(userId)) {
        newAdvancedInPeriod.add(userId);
        seenAdvancedCreators.add(userId);
      }
    });
    return {
      name: g.label,
      totalCreators: g.allCreators.size,
      advancedCreators: g.advancedCreators.size,
      newAdvancedCreators: newAdvancedInPeriod.size,
      sortKey: g.sortKey
    };
  });
};

export const analyzeMeetings = (meetings: Meeting[]): AnalysisResult => {
  const uniqueCreators = new Set<string>();
  const highImpactCreators = new Set<string>();
  const creatorCounts: Record<string, number> = {};
  const advancedCreatorCounts: Record<string, number> = {};
  const advancedCreatorLastMeeting: Record<string, Date> = {};

  let durationBuckets = {
    '< 15分钟': 0,
    '15-30分钟': 0,
    '30-60分钟': 0,
    '> 60分钟': 0,
  };

  let participantBuckets = {
    '< 10人': 0,
    '10-50人': 0,
    '50-100人': 0,
    '> 100人': 0,
  };

  meetings.forEach(m => {
    uniqueCreators.add(m.userId);
    
    creatorCounts[m.userId] = (creatorCounts[m.userId] || 0) + 1;

    if (m.durationMinutes > 40 || m.participantCount > 100) {
      highImpactCreators.add(m.userId);
      advancedCreatorCounts[m.userId] = (advancedCreatorCounts[m.userId] || 0) + 1;
      if (!advancedCreatorLastMeeting[m.userId] || m.startTime > advancedCreatorLastMeeting[m.userId]) {
        advancedCreatorLastMeeting[m.userId] = m.startTime;
      }
    }

    if (m.durationMinutes < 15) durationBuckets['< 15分钟']++;
    else if (m.durationMinutes < 30) durationBuckets['15-30分钟']++;
    else if (m.durationMinutes < 60) durationBuckets['30-60分钟']++;
    else durationBuckets['> 60分钟']++;

    if (m.participantCount < 10) participantBuckets['< 10人']++;
    else if (m.participantCount < 50) participantBuckets['10-50人']++;
    else if (m.participantCount <= 100) participantBuckets['50-100人']++;
    else participantBuckets['> 100人']++;
  });

  const topCreators = Object.entries(creatorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const advancedCreatorsList = Object.entries(advancedCreatorCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({ name, count, lastMeetingTime: advancedCreatorLastMeeting[name] }));

  const overlappingMeetingsCountMap: Record<string, number> = {};
  
  const userMeetingsByDate: Record<string, Record<string, Meeting[]>> = {};
  meetings.forEach(m => {
    const dateStr = format(m.startTime, 'yyyy-MM-dd');
    if (!userMeetingsByDate[m.userId]) userMeetingsByDate[m.userId] = {};
    if (!userMeetingsByDate[m.userId][dateStr]) userMeetingsByDate[m.userId][dateStr] = [];
    userMeetingsByDate[m.userId][dateStr].push(m);
  });

  Object.entries(userMeetingsByDate).forEach(([userId, dates]) => {
    Object.entries(dates).forEach(([, userMeetings]) => {
      if (userMeetings.length < 2) return;
      
      userMeetings.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      
      const adj: number[][] = Array.from({ length: userMeetings.length }, () => []);
      for (let i = 0; i < userMeetings.length; i++) {
        for (let j = i + 1; j < userMeetings.length; j++) {
          if (userMeetings[i].meetingId && userMeetings[j].meetingId && 
              userMeetings[i].meetingId === userMeetings[j].meetingId) {
            continue;
          }

          if (userMeetings[i].endTime > userMeetings[j].startTime) {
            adj[i].push(j);
            adj[j].push(i);
          } else {
            break;
          }
        }
      }
      
      const visited = new Set<number>();
      let overlapEvents = 0;
      for (let i = 0; i < userMeetings.length; i++) {
        if (!visited.has(i)) {
          const component: number[] = [];
          const queue = [i];
          visited.add(i);
          while (queue.length > 0) {
            const u = queue.shift()!;
            component.push(u);
            for (const v of adj[u]) {
              if (!visited.has(v)) {
                visited.add(v);
                queue.push(v);
              }
            }
          }
          if (component.length > 1) {
            overlapEvents++;
          }
        }
      }
      
      if (overlapEvents > 0) {
        overlappingMeetingsCountMap[userId] = overlapEvents;
      }
    });
  });
  
  const overlappingMeetingsList = Object.entries(overlappingMeetingsCountMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
    
  const overlappingMeetingsCount = overlappingMeetingsList.length;

  return {
    totalMeetings: meetings.length,
    totalUniqueCreators: uniqueCreators.size,
    highImpactCreators: highImpactCreators.size,
    meetingsByDuration: Object.entries(durationBuckets).map(([name, value]) => ({ name, value })),
    meetingsByParticipants: Object.entries(participantBuckets).map(([name, value]) => ({ name, value })),
    topCreators,
    advancedCreatorsList,
    overlappingMeetingsCount,
    overlappingMeetingsList,
    rawData: meetings,
    trends: {
      weekly: calculateTrends(meetings, 'week'),
      monthly: calculateTrends(meetings, 'month'),
      quarterly: calculateTrends(meetings, 'quarter'),
    }
  };
};
