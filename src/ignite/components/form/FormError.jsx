import { useFormContext } from 'react-hook-form';
import get from 'lodash.get';

const FormError = ({ name, ...rest }) => {
  const { formState } = useFormContext();

  const error = get(formState.errors, name);

  return (
    error && (
      <p className="mt-1 text-xs text-red-500" {...rest}>
        {error.message}
      </p>
    )
  );
};

export default FormError;
