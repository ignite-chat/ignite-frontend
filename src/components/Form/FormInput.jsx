import { useFormContext } from 'react-hook-form';

const FormInput = ({ name, validation, size = 'md', className, ...rest }) => {
  const { register } = useFormContext();
  const sizeClasses = size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-2';

  return (
    <input
      {...(name && register(name, validation))}
      {...rest}
      className={`w-full rounded-md border border-white/5 bg-gray-800 ${sizeClasses} text-white focus:border-primary focus:ring-primary ${className}`}
    />
  );
};

export default FormInput;
