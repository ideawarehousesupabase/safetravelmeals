// The one processing API the app calls. The MVP plugs in the deterministic rule engine;
// a future AI/ML engine implements the same interface and no page has to change.
import { RULE_ENGINE, planInputHash, processJourney } from "./rule-engine";
import { processWorkspace } from "./workspace";
import type { JourneyInput, Plan, TravellerInput, Workspace, WorkspaceSnapshot } from "./types";
import type { Naive } from "../jaap/time";

export interface ProcessingEngine {
  name: string;
  version: string;
  // Primary journey input → derived plan (windows, exclusion set, kits, handovers, product).
  processInput(journey: JourneyInput, traveller: TravellerInput | undefined, computedAt: string): Plan;
  // Whether a stored plan still matches its inputs.
  inputHash(journey: JourneyInput, traveller: TravellerInput | undefined): string;
  // Every primary record + stored plans → the whole derived workspace.
  processWorkspace(snapshot: WorkspaceSnapshot, now?: Naive, computedAt?: string): Workspace;
}

export const ruleEngine: ProcessingEngine = {
  ...RULE_ENGINE,
  processInput: processJourney,
  inputHash: planInputHash,
  processWorkspace,
};

let active: ProcessingEngine = ruleEngine;

export const getEngine = () => active;
export const setEngine = (engine: ProcessingEngine) => {
  active = engine;
};

export const processInput: ProcessingEngine["processInput"] = (...args) => active.processInput(...args);
export const inputHash: ProcessingEngine["inputHash"] = (...args) => active.inputHash(...args);
export const deriveWorkspace: ProcessingEngine["processWorkspace"] = (...args) => active.processWorkspace(...args);

export { verifyChain, KITCHEN, evaluateClearance, staffName } from "./workspace";
export { validLeg, kitIdFor, sealFor } from "./rule-engine";
export * from "./types";
