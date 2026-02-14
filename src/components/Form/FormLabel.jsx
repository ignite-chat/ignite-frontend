const FormLabel = ({ htmlFor, help, children }) => {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-base font-medium text-white">
        {children}
      </label>
      <p className="text-gray-text min-h-[1.5rem] truncate text-xs">{help || ''}</p>
    </div>
  );
};

export default FormLabel;
