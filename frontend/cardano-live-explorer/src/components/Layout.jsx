function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#0a0f1a] p-10">
      <div className="max-w-[1920px] mx-auto">{children}</div>
    </div>
  );
}

export default Layout;
