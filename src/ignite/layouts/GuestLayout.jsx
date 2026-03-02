const GuestLayout = ({ children }) => {
  return (
    <div>
      <div className="flex h-full items-center justify-center overflow-hidden">
        <main className="w-full p-4 md:p-6 2xl:px-10">{children}</main>
      </div>
    </div>
  );
};

export default GuestLayout;
