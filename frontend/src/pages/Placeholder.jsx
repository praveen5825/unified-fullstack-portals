import Topbar from '../layout/Topbar';

export default function Placeholder({ title, subtitle }) {
  return (
    <div>
      <Topbar title={title} subtitle={subtitle} />
      <div className="rounded-2xl bg-surface border border-border-soft p-10 text-center text-text-faint text-sm">
        This module is already part of your existing project — this route is a placeholder
        so the sidebar navigation stays complete.
      </div>
    </div>
  );
}
