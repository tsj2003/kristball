import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kb_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith("/login")) {
      localStorage.removeItem("kb_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export type Role = "ADMIN" | "BASE_COMMANDER" | "LOGISTICS_OFFICER";

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  baseId: string | null;
  base: { id: string; name: string; code: string } | null;
};

export type Summary = {
  opening: number;
  purchases: number;
  transfersIn: number;
  transfersOut: number;
  netMovement: number;
  assigned: number;
  expended: number;
  closing: number;
};

export type Holding = {
  equipmentTypeId: string;
  name: string;
  category: string;
  unit: string;
  received: number;
  available: number;
  assigned: number;
  assignedRemaining: number;
  expended: number;
  baseId: string;
  baseName: string;
  baseCode: string;
};

export type PersonnelHolding = {
  assignmentId: string;
  personnelId: string;
  personnelName: string;
  rank: string;
  serviceNumber: string;
  equipmentTypeId: string;
  equipmentName: string;
  category: string;
  unit: string;
  assignedQty: number;
  expended: number;
  remaining: number;
  assignedAt: string;
  notes: string | null;
  baseId: string;
  baseName: string;
};

export type EquipmentType = {
  id: string;
  name: string;
  category: string;
  unit: string;
  description: string | null;
};

export type Base = {
  id: string;
  name: string;
  code: string;
  location: string;
};

export type Person = {
  id: string;
  fullName: string;
  rank: string;
  serviceNumber: string;
  baseId: string;
};

export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error || err.message;
  }
  return "Unexpected error";
}
