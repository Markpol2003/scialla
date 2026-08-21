export default function FlipCard() {
  return (
    /* The parent needs 'perspective' to create the 3D depth illusion */
    <div className="group w-64 h-80 perspective-[1000px] cursor-pointer">
      {/* The inner wrapper handles the 3D rotation */}
      <div className="relative w-full h-full transition-transform duration-700 preserve-3d group-hover:rotate-y-180">
        {/* Front of Card */}
        <div className="absolute inset-0 backface-hidden bg-amber-800 text-white flex justify-center items-center rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold">Menu</h2>
        </div>

        {/* Back of Card (Rotated 180deg by default) */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-stone-100 text-amber-900 flex justify-center items-center rounded-xl shadow-lg border-2 border-amber-800">
          <p className="font-semibold">Iced Vanilla Latte</p>
        </div>
      </div>
    </div>
  );
}
