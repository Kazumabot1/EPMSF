export interface PositionLevelRequest {
  levelCode: string;
}

export interface PositionLevelResponse {
  id: number;
  levelCode: string;
}

export interface PositionRequest {
  positionTitle: string;
  levelId: number;
  description: string;
  status: boolean;
  createdBy: string;
}

export interface PositionResponse {
  id: number;
  positionTitle: string;
  levelId: number;
  levelCode: string;
  description: string;
  status: boolean;
  createdAt: string;
  createdBy: string;
}
