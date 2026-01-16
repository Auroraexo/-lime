
export interface EmailCampaign {
  subjectLines: string[];
  bodyCopy: string;
  cta: string;
  imagePrompt: string;
}

export type ImageSize = 'Standard' | '1K' | '2K' | '4K';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GeneratedAsset {
  type: 'image';
  url: string;
  prompt: string;
}

export enum AppStatus {
  IDLE = 'idle',
  GENERATING_CONTENT = 'generating_content',
  GENERATING_IMAGE = 'generating_image',
  ERROR = 'error'
}
