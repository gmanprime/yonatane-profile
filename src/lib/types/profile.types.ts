export interface ResolvedProfileItem {
  id: string;
  data: Record<string, unknown>;
  displayOrder: number;
}

export interface ResolvedProfileSection {
  id: string;
  type: string;
  title: string;
  icon: string;
  columns: number;
  displayOrder: number;
  items: ResolvedProfileItem[];
}

export interface ResolvedProfile {
  profile: {
    id: string;
    name: string;
    description: string | null;
    hash: string;
    isDefault: boolean;
  };
  basics: Record<string, unknown>;
  summary: string;
  picture: Record<string, unknown>;
  theme: Record<string, unknown>;
  sections: ResolvedProfileSection[];
}
