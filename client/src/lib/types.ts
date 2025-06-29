export interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  current?: boolean;
}

export interface AgentCardProps {
  name: string;
  description: string;
  status: 'idle' | 'active' | 'completed' | 'failed';
  progress: number;
  lastAction: string;
  icon: string;
}

export interface RiskCardProps {
  type: string;
  level: 'low' | 'medium' | 'high';
  description: string;
  icon: string;
}

export interface DrugInteractionProps {
  drugs: string[];
  severity: 'minor' | 'moderate' | 'major';
  description: string;
}

export interface GuidelineProps {
  title: string;
  organization: string;
  year: number;
  relevance: 'high' | 'medium' | 'low';
}
