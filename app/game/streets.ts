/** Town roads are two 32 px cells wide; their axis sits between those cells. */
export const STREET_STARTS = [0, 10, 20, 30] as const;
export const STREET_WIDTH = 2;
export function streetCenter(cell: number): number | undefined {
  const start = STREET_STARTS.find(
    (start) => cell >= start && cell < start + STREET_WIDTH,
  );
  return start === undefined ? undefined : start + STREET_WIDTH / 2;
}
