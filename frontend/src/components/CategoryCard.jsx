import React from "react";
const CategoryCard = ({ name, icon, count, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 flex items-center justify-between group ${
        isActive
          ? "bg-emerald-800 text-white border-emerald-800 shadow-md shadow-emerald-900/10"
          : "bg-white border-sage-100 text-gray-800 hover:border-emerald-300 hover:bg-sage-50/50"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`text-2xl p-2 rounded-xl transition-colors ${isActive ? "bg-emerald-700" : "bg-sage-50 group-hover:bg-emerald-50"}`}>
          {icon}
        </span>
        <div>
          <h4 className="font-bold text-sm tracking-tight">{name}</h4>
          {count && (
            <p className={`text-[11px] mt-0.5 ${isActive ? "text-emerald-200" : "text-gray-400"}`}>
              {count} Options
            </p>
          )}
        </div>
      </div>
      <span className={`text-xs font-bold transition-transform group-hover:translate-x-0.5 ${isActive ? "text-emerald-300" : "text-gray-400"}`}>
        →
      </span>
    </button>
  );
};

export default CategoryCard;