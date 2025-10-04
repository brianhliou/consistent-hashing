export type Replica = {
  slot: number;
  nodeId: string;
};

export type Node = {
  id: string;
  replicas: number;
  up: boolean;
  color: string;
};

export type LabState = {
  slots: number;
  nodes: Record<string, Node>;
  replication: number;
  replicasDefault: number;
  replicas: Replica[];
  owners: number[];
  prevOwners?: number[];
  probeKey?: string;
};
