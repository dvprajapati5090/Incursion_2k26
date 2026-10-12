/**
 * SelectionPanel — configures topX and waitlistSize.
 */
import useConfigStore from "@/stores/configStore";

export default function SelectionPanel() {
  const { config, setTopX, setWaitlistSize } = useConfigStore();
  const { topX, waitlistSize } = config.selection ?? {};

  return (
    <div className="rounded-xl border p-5 bg-card space-y-4">
      <h3 className="font-semibold">Selection</h3>
      <div className="grid grid-cols-2 gap-4">
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Shortlist top X teams</span>
          <input
            type="number"
            min={1}
            value={topX ?? 50}
            onChange={(e) => setTopX(Math.max(1, Number(e.target.value)))}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
          />
          <p className="text-xs text-muted-foreground">Teams ranked 1 to X are shortlisted</p>
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Waitlist size</span>
          <input
            type="number"
            min={0}
            value={waitlistSize ?? 0}
            onChange={(e) => setWaitlistSize(Math.max(0, Number(e.target.value)))}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
          />
          <p className="text-xs text-muted-foreground">Teams ranked X+1 to X+waitlist</p>
        </label>
      </div>
    </div>
  );
}
