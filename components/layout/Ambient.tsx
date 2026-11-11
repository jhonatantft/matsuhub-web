/** Fixed background grid and film grain shared by every page. */
export function Ambient() {
  return (
    <>
      <div aria-hidden className="ambient-grid" />
      <div aria-hidden className="ambient-grain" />
    </>
  );
}
