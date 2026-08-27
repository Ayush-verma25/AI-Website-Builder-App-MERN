import React from "react";

const LoginLeft = () => {
  return (
    <div className="hidden lg:flex lg:w-2/5 bg-[url('/bg-img.webp')] bg-cover bg-center bg-no-repeat flex-col justify-between p-12 shrink-0 select-none">
      <div className="flex items-center gap-3">
        <img src="/logo.svg" alt="Logo" className="h-16 w-auto" />
        <span className="text-2xl font-medium text-white">
          AI Website Builder
        </span>
      </div>

      <div>
        <h2 className="text-3xl text-white font-medium leading-snug mb-3 tracking-tight">
          Build your own AI powered website
        </h2>
        <p className="text-zinc-300">
          Describe your website and we'll build it for you. We'll use the latest
          AI technology to create a website that's optimized for your needs.
        </p>

        <p className="text-zinc-300 text-sm mt-12">
          Copyright {new Date().getFullYear()} by SiteSpark. All rights
          reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginLeft;
