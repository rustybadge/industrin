import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq } from "drizzle-orm";

// More authentic descriptions from your JSON files
const moreAuthentic = [
  {
    name: "Duroc Laser Coating AB",
    description: "Sweden's leading company in laser surface treatment. They offer expert repair of steel surfaces and manufacturing of customer-unique surface-treated components. They handle everything from single grams to several metric tons using laser cladding technology for surfaces exposed to wear, heat or corrosion.",
    website: "duroclasercoating.se",
    phone: "+46 920 43 22 20"
  },
  {
    name: "Element Metech AB", 
    description: "A leading, independent full-service provider of calibration services, validation services, dimensional inspections, and metrology consultancy. With over 70 years in the business, they provide one of the broadest and most reliable ranges of calibration services in Europe with 400 calibration experts working across 20 laboratories.",
    website: "elementmetech.com",
    phone: "+46 (0)10-603 61 00",
    email: "info.se@element.com"
  },
  {
    name: "Eliasson & Lund Industrial Partner AB",
    description: "A complete mechanical workshop located just west of Gothenburg, operating since 1954. They specialize in prototyping and contract manufacturing covering everything from test and experimental services to comprehensive manufacturing series. They offer design, drawing production, cutting, sheet metal work, pipe machining, welding, and surface finishing.",
    website: "elilund.se",
    phone: "+46031-92 02 10",
    email: "info@elilund.se"
  },
  {
    name: "Elme Magnets",
    description: "Älmhults El-Mek has been working at the forefront of the electro-mechanical industry since 1955, developing methods and manufacturing machines for environmental and recycling operations. They construct and produce magnetic products with high technical performance, supplying everything from the strongest heavy-duty magnets to chip collectors for workshop floors.",
    website: "elmemagnets.com",
    phone: "+46 (0)476-150 05",
    email: "info@elmemagnets.com"
  },
  {
    name: "Entech Energiteknik AB",
    description: "Situated in Ängelholm in southern Sweden, operating since 1978. They design and deliver high-temperature furnaces including tube furnaces, chamber furnaces, and special furnaces with temperatures ranging from 1000-2000°C. They customize furnaces according to customer needs and have extensive experience delivering to customers in numerous countries.",
    website: "entech.se",
    phone: "+46 431 449980",
    email: "janne.jyrinki@entech.se"
  },
  {
    name: "E-Rotor AB",
    description: "Operating in Sorsele in Västerbotten's inland since 1998, employing 6 people. They conduct sales and development of their own products such as engine heater clocks and condensation guards within low-voltage electronics and energy. They also manufacture cables and electronics, provide TV/radio/communication radio service, and install antennas and satellite dishes.",
    website: "e-rotor.se",
    phone: "0952-100 15"
  },
  {
    name: "EU Robotservice AB",
    description: "A service and automation company with focus on industrial robots. They offer new and used ABB, Kuka, Fanuc and OTC robots, repair of robots, parts, robot installations, courses, programming, design of robot tools, transport systems, safety systems and CE-certification. They have experience in most production industries including metal, food, building, plastic, furniture, paper, and packaging.",
    website: "robotservice.se",
    phone: "070-671 07 63",
    email: "info@robotservice.se"
  },
  {
    name: "FANUC Nordic AB",
    description: "World's leading automation company providing CNC, LASER, ROBOT and ROBOMACHINE sales and services. They offer innovative factory automation solutions including industrial robots, CNC systems, ROBODRILL machining centers, ROBOSHOT injection molding machines, ROBOCUT wire-cut EDM machines, and IIoT solutions. They serve manufacturing industries worldwide with over 100 robot models and comprehensive automation solutions.",
    website: "fanuc.eu",
    phone: "+46 8 505 80 700",
    email: "academy@fanuc.se"
  }
];

async function bulkRestore() {
  console.log("Bulk restoring more authentic descriptions...");
  
  let updated = 0;
  
  for (const company of moreAuthentic) {
    const existing = await db
      .select()
      .from(companies)
      .where(eq(companies.name, company.name))
      .limit(1);
    
    if (existing.length > 0) {
      await db
        .update(companies)
        .set({
          description: company.description,
          website: company.website || existing[0].website || '',
          phone: company.phone || existing[0].phone || '',
          email: company.email || existing[0].email || ''
        })
        .where(eq(companies.id, existing[0].id));
      
      updated++;
      console.log(`✓ ${company.name}`);
    }
  }
  
  console.log(`\nBulk restored ${updated} more authentic descriptions`);
}

bulkRestore().catch(console.error);