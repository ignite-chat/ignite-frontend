import { useFormContext } from 'react-hook-form';

const FormToggle = ({ name, validation, label = '', ...rest }) => {
  const { register } = useFormContext();

  return (
    <label className="inline-flex cursor-pointer items-center">
      <input
        {...(name && register(name, validation))}
        type="checkbox"
        {...rest}
        className="peer sr-only"
      />
      <div className="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-white/5 dark:bg-gray-700 dark:peer-focus:ring-blue-800 rtl:peer-checked:after:-translate-x-full"></div>
      <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">{label}</span>
    </label>
  );
};

export default FormToggle;
