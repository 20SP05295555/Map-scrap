export enum AppTab {
  MAPS_SCRAPER = 'MAPS_SCRAPER',
  WHATSAPP_CHECKER = 'WHATSAPP_CHECKER',
  RANK_CHECKER = 'RANK_CHECKER',
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri:string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        uri: string;
        title: string;
        text: string;
      }[];
    }[]
  };
}

export interface Business {
  name: string;
  address: string;
  phone: string;
  description: string;
  rating?: number;
  reviewCount?: number;
  // New fields for deep scrape
  category?: string;
  website?: string;
  recentReviewReplyDate?: string;
  ownerName?: string;
  ownerSocialMedia?: string[];
  companySocialMedia?: string[];
}


export interface ScrapeResult {
  text: string;
  sources: GroundingChunk[];
  businesses?: Business[];
}

export interface KeywordRank {
  keyword: string;
  rank: string;
}

export interface RankingResult {
  rank: string | null;
  imageUrl: string | null;
  discoveredRanks: KeywordRank[] | null;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export type WhatsAppStatus = 'Likely Active' | 'Likely Inactive' | 'Unknown';

export interface WhatsAppCheckResult {
  status: WhatsAppStatus;
  reason: string;
}