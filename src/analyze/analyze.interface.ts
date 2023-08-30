import { IBotContext } from "../context/context.interface";

export interface IAnalyze {
  analyzeAddress(ctx: IBotContext): Promise<string>;
}
