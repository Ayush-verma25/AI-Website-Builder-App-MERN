import React, { useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import Promptinput from "../components/Promptinput";
import { homeTags } from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { ArrowRightIcon, ClockIcon, Trash2Icon } from "lucide-react";
import moment from "moment";

const HomePage = () => {
  const navigate = useNavigate();

  const {
    user,
    projects,
    loadingProjects,
    generatingProject,
    loadProjects,
    handleGenerate,
    handleDelete,
    logout,
  } = useAppContext();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <div className="h-screen overflow-y-scroll text-white font-sans bg-[url('/bg-img.webp')] bg-cover bg-center bg-no-repeat">
      {/* Navbar */}
      <nav className="sticky top-0 z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="logo" className="h-16 w-auto" />
          <span className="text-xl font-semibold tracking-tight">
            AI Website Builder
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm font-medium text-zinc-300">
          <span>{user?.name}</span>
          <button
            onClick={logout}
            className="py-1.5 px-3 border border-white/20 text-white hover:bg-white/10 text-sm rounded cursor-pointer bg-transparent"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 mt-8 xl:mt-28">
        <div className="w-fit max-w-2xl flex flex-col items-center">
          {/* Promo badge */}
          <div className="flex items-center gap-2 p-1.5 pr-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[13px] text-white/90">
            <span className="px-3 py-1 text-[11px] bg-violet-700 rounded-full font-medium tracking-wider">
              PROMO
            </span>
            <span>Create your First Website for Free.</span>
          </div>

          {/* title */}
          <h1 className="text-center text-4xl md:text-6xl font-medium mt-4 max-w-2xl text-white">
            Let's Build Your Website Together
          </h1>
          <p className="text-center text-xs md:text-base max-w-xl mt-4 text-white/65 leading-relaxed">
            Describe your website and we'll build it for you. We'll use the
            latest AI technology to create a website that's optimized for your
            needs.
          </p>

          {/* Prompt input with Glassmorphic variant */}
          <div className="w-full mt-6">
            <Promptinput
              onSubmit={handleGenerate}
              loading={generatingProject}
              placeholder="Create a Portfolio Website..."
              variant="glass"
              autoFocus
            />
          </div>

          {/* Scrolling Marquee tags */}
          <div className="masked-marquee w-full mt-4 max-w-2xl overflow-hidden py-1">
            <div className="animate-marquee gap-3">
              {homeTags.map((tag, i) => (
                <button
                  key={i}
                  onClick={() => handleGenerate(tag)}
                  disabled={generatingProject}
                  className="px-4 py-1.5 border rounded-full text-sm text-white bg-white/10 border-white/25 hover:bg-white/20 transition cursor-pointer shrink-0 font-medium"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* All Projects */}
          {!loadingProjects && projects.length > 0 && (
            <div className="mt-12 w-full">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
                <p className="text-xs font-medium uppercase text-zinc-100 -tracking-widest">
                  All Projects
                </p>
                <span className="text-xs text-zinc-100 font-normal">
                  {projects.length}{" "}
                  {projects.length === 1 ? "project" : "projects"}
                </span>
              </div>

              <div className="space-y-2 max-h-[80vh] overflow-y-auto pr-1">
                {projects.map((p) => (
                  <div
                    key={p._id}
                    className="group flex bg-white/5 border border-white/10 rounded-lg px-4 py-3 items-center justify-between gap-3 hover:border-white/20 hover:bg-white/10 cursor-pointer backdrop-blur-md transition-all"
                    onClick={() => navigate(`/builder/${p._id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {p.name}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-zinc-300 flex items-center gap-1">
                          <ClockIcon size={10} />
                          {moment(p.updatedAt || p.createdAt).fromNow()}
                        </span>
                        <span className="text-xs text-white/60 font-medium">
                          v{p.version}
                        </span>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(p._id);
                      }}
                    >
                      <button className="p-1.5 rounded-md text-zinc-200 hover:text-red-400 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2Icon size={14} />
                      </button>
                      <ArrowRightIcon
                        size={14}
                        className="text-zinc-200 group-hover:text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;