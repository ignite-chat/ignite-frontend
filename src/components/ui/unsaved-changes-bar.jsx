import { Button } from '@/components/ui/button';

const UnsavedChangesBar = ({ show, saving, onSave, onReset, message = 'Careful — you have unsaved changes!' }) => {
  if (!show) return null;

  return (
    <div className="pointer-events-none sticky bottom-0 z-50 flex justify-center pb-2 pt-4">
      <div className="pointer-events-auto flex max-w-full items-center gap-6 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
        <span className="text-xs font-medium text-primary">{message}</span>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onReset} disabled={saving}>
            Reset
          </Button>
          <Button type="button" size="sm" onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesBar;
