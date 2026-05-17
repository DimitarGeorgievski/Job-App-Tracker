import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#c1c6d4]">
      <div className="flex flex-col md:flex-row justify-between items-center w-full py-4 px-6 max-w-282 mx-auto gap-4">
        <div className="flex flex-col items-center md:items-start">
          <span className="text-sm font-semibold text-[#414752]">
            CareerPath Platform
          </span>
          <p className="text-xs text-[#414752] mt-1">
            © 2024 CareerPath Platform. Professional Edition.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          {[
            "Privacy Policy",
            "Terms of Service",
            "Cookie Policy",
            "Help Center",
          ].map((item) => (
            <Link
              key={item}
              href="/in-work"
              className="text-xs text-[#414752] hover:text-[#004e99] transition-colors"
            >
              {item}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
