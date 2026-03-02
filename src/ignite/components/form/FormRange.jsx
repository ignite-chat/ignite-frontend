import { useFormContext } from 'react-hook-form';

const FormRange = ({
  name,
  validation,
  className,
  valuePrefix,
  valueSuffix,
  min,
  max,
  step,
  ...rest
}) => {
  const { register, watch, setValue } = useFormContext();

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center rounded-lg bg-dark-bg-active px-3 py-1.5">
        <span className="text-sm font-medium text-white">{valuePrefix ? valuePrefix : ''}</span>
        <input
          type="number"
          value={watch(name)}
          onChange={(e) => setValue(name, e.target.value)}
          min={min}
          max={max}
          step={step}
          className="w-12 border-0 bg-transparent p-0 text-center text-sm text-white focus:ring-0"
        />
        <span className="text-sm font-medium text-white">{valueSuffix ? valueSuffix : ''}</span>
      </div>
      <input
        {...(name && register(name, validation))}
        type="range"
        min={min}
        max={max}
        step={step}
        {...rest}
        className={`w-full rounded-md border border-white/5 bg-dark-bg-active px-4 py-2 text-white focus:border-primary focus:ring-primary ${className}`}
      />
    </div>
  );
};

export default FormRange;
