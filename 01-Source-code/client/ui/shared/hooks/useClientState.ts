import { useSyncExternalStore, useMemo } from 'react';
import type { ClientState, ClientStateSnapshot } from '../../../state/ClientState';

export type { ClientStateSnapshot };

/**
 * React Hook สำหรับเชื่อมต่อและซิงก์สถานะของ ClientState เข้ากับวงจรชีวิตของคอมโพเนนต์
 * ใช้ useSyncExternalStore เพื่อให้คอมโพเนนต์เรนเดอร์ใหม่ทันทีเมื่อข้อมูลสถานะมีการเปลี่ยนแปลง
 */
export function useClientState(clientState: ClientState) {
  // สร้างฟังก์ชัน subscribe ที่มีความเสถียร (Stable Reference) สำหรับ useSyncExternalStore
  const subscribe = useMemo(() => clientState.subscribe.bind(clientState), [clientState]);

  return useSyncExternalStore(subscribe, () => clientState.getSnapshot());
}
