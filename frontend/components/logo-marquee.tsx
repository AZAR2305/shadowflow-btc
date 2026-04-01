import Image from "next/image";

export function LogoMarquee() {
  const items = [
    { logo: "/logos/application.svg", alt: "application" },
    { logo: "/logos/business.svg", alt: "business" },
    { logo: "/logos/company.svg", alt: "company" },
    { logo: "/logos/startup.svg", alt: "startup" },
    { logo: "/logos/venture.svg", alt: "venture" },
    { logo: "/logos/agency.svg", alt: "agency" },
  ]

  return (
    <div className="overflow-hidden">
      <div className="relative overflow-hidden bg-black py-16 -rotate-[5deg] mt-32 mb-16 min-w-[120vw] -mx-[10vw] left-0">
        <div className="flex items-center gap-16 animate-marquee whitespace-nowrap">
          {[...items, ...items, ...items, ...items].map((item, index) => (
            <Image
              key={index}
              src={item.logo || "/placeholder.svg"}
              alt={item.alt}
              width={160}
              height={48}
              className="h-12 w-auto"
              priority={index === 0}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
