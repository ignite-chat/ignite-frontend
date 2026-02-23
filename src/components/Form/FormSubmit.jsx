import { CircleNotch, FloppyDisk } from '@phosphor-icons/react';

const FormSubmit = ({
  form,
  label = 'Save',
  icon = <FloppyDisk className="size-4" />,
  className = '',
}) => {
  return (
    <button
      type="submit"
      disabled={form.formState.isSubmitting}
      className={`inline-flex min-w-32 items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-5 py-2.5 text-sm text-white shadow-md ${className}`}
    >
      <span>{label}</span>
      {form.formState.isSubmitting && <CircleNotch className="size-4 animate-spin" />}
      {!form.formState.isSubmitting && icon}
    </button>
  );
};

export default FormSubmit;
