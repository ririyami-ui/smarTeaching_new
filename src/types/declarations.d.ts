interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

declare module "*.css";
declare module "moment/locale/id";
declare module "file-saver";
declare module "react-big-calendar" {
  import { ComponentType, ReactNode } from "react";
  export interface Event {
    title?: string;
    start?: Date;
    end?: Date;
    allDay?: boolean;
    resource?: unknown;
  }
  export const Calendar: ComponentType<object>;
  export const momentLocalizer: (moment: unknown) => unknown;
}
