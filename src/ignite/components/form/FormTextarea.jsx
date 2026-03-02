import { useFormContext } from 'react-hook-form';

const FormTextarea = ({ name, validation, ...rest }) => {
  const { register } = useFormContext();

  return (
    <textarea
      {...(name && register(name, validation))}
      {...rest}
      className="w-full rounded-md border border-white/5 bg-dark-bg-active px-4 py-2 text-white focus:border-primary focus:ring-primary"
    />
  );
};

export default FormTextarea;
