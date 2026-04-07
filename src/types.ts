export interface Meeting {
  userId: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  participantCount: number;
  meetingId?: string;
  subject?: string;
}

export interface TrendData {
  name: string;
  totalCreators: number;
  advancedCreators: number;
  newAdvancedCreators: number;
  sortKey: number;
}

export interface AnalysisResult {
  totalMeetings: number;
  totalUniqueCreators: number;
  highImpactCreators: number;
  meetingsByDuration: { name: string; value: number }[];
  meetingsByParticipants: { name: string; value: number }[];
  topCreators: { name: string; count: number }[];
  advancedCreatorsList: { name: string; count: number; lastMeetingTime: Date }[];
  overlappingMeetingsCount: number;
  overlappingMeetingsList: { name: string; count: number }[];
  rawData: Meeting[];
  trends: {
    weekly: TrendData[];
    monthly: TrendData[];
    quarterly: TrendData[];
  };
}
