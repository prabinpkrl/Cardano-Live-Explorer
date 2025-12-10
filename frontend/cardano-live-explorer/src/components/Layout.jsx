function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#050505] p-10">
      <div className="max-w-[1920px] mx-auto">{children}</div>
    </div>
  );
}

export default Layout;
