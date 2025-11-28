import { EventList } from "./eventstype"


export type GroupEventData ={
    [groupKey: string]: EventList[]
}
export interface GroupEventDataType {
    label: string;
    events: EventList[];
}