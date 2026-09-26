type BulldogIllustrationProps = {
  className?: string;
};

export function BulldogIllustration({ className = "" }: BulldogIllustrationProps) {
  return (
    <svg className={className} viewBox="0 0 200 190" role="img" aria-label="A friendly bulldog wearing a Yale-blue bandana">
      <ellipse cx="101" cy="175" rx="56" ry="8" fill="#183653" opacity=".13" />
      <path d="M55 119c-7 6-12 22-9 36 2 10 12 13 26 11l24-4 26 4c15 2 25-3 27-13 3-13-3-27-11-34z" fill="#f5f1e8" stroke="#17334f" strokeWidth="3" strokeLinejoin="round" />
      <path d="M62 56C41 39 32 49 36 68c2 11 11 18 23 17zm76 0c21-17 30-7 26 12-2 11-11 18-23 17z" fill="#6c7782" stroke="#17334f" strokeWidth="3" strokeLinejoin="round" />
      <path d="M59 57c7-18 22-27 41-27s34 9 41 27c8 20 4 46-4 60-8 13-23 19-37 19s-29-6-37-19c-8-14-12-40-4-60z" fill="#fffdf8" stroke="#17334f" strokeWidth="3" strokeLinejoin="round" />
      <path d="M67 76c5-8 13-10 21-7m24 0c8-3 16-1 21 7" fill="none" stroke="#17334f" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="79" cy="83" rx="4" ry="5" fill="#17334f" />
      <ellipse cx="121" cy="83" rx="4" ry="5" fill="#17334f" />
      <path d="M72 96c7-8 18-10 28-8 10-2 21 0 28 8 5 6 5 17-1 24-6 7-17 9-27 9s-21-2-27-9c-6-7-6-18-1-24z" fill="#e8e2d8" stroke="#17334f" strokeWidth="2.5" />
      <path d="M90 96c2-5 6-7 10-7s8 2 10 7c1 4-3 8-10 8s-11-4-10-8z" fill="#17334f" />
      <path d="M100 104v10m0 0c-4 7-10 8-16 4m16-4c4 7 10 8 16 4" fill="none" stroke="#17334f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M66 119c9 10 21 15 34 15s25-5 34-15l-8 34-26 8-26-8z" fill="#173d67" stroke="#17334f" strokeWidth="3" strokeLinejoin="round" />
      <path d="m100 130 8 8-8 14-8-14z" fill="#f7f4ec" />
      <path d="M100 135v10m-5-5h10" stroke="#173d67" strokeWidth="2" strokeLinecap="round" />
      <path d="M60 157c-2 7 1 12 8 12h17c5 0 7-3 7-8m15 0c0 5 2 8 7 8h17c7 0 10-5 8-12" fill="#fffdf8" stroke="#17334f" strokeWidth="3" strokeLinejoin="round" />
      <path d="M50 113c-5 8-4 17 1 21m99-21c5 8 4 17-1 21" fill="none" stroke="#c5ccd0" strokeWidth="3" strokeLinecap="round" />
      <circle cx="70" cy="101" r="2" fill="#b5a99c" />
      <circle cx="130" cy="101" r="2" fill="#b5a99c" />
    </svg>
  );
}
