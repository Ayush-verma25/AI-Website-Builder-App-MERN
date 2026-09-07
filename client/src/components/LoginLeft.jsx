import React from "react";

const LoginLeft = () => {
  return (
    <div className="hidden lg:flex lg:w-2/5 bg-[url('/bg-img.webp')] bg-cover bg-center bg-no-repeat flex-col justify-between p-12 shrink-0 select-none">
      <div className="flex items-center gap-3">
        <img src="/logo.svg" alt="Logo" className="h-16 w-auto" />
        <span className="text-xl font-medium text-white">
          AI Website builder
        </span>
      </div>
      <div>
        <h2 className="text-3xl text-white font-medium leading-snug mb-3 tracking-tight">
          Build your presence on web
        </h2>
        <p className="text-zinc-300">
          Describe what you need, preview instantly, and customize your site in
          real-time. React with clean JSX, verified layouts, and instant code
          exports.
        </p>
        <p className="text-zinc-300 text-sm mt-12">
          Copyright {new Date().getFullYear()} SiteSpark. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginLeft;
