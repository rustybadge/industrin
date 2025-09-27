import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq } from "drizzle-orm";

// All authentic descriptions from your JSON files
const authenticDescriptions = [
  {
    name: "Constructor Sverige AB",
    description: "Constructor is a leading supplier of warehouse fixtures and logistics solutions in Sweden. They help customers through the entire process from planning to installation, service, inspection, and support. They offer advanced innovative storage solutions and are part of Gonvarri Material Handling.",
    website: "constructor.se",
    phone: "+46 31 771 96 00",
    email: "info@constructor.se"
  },
  {
    name: "Cranemech AB",
    description: "An industrial company in the lifting industry with experience in service, assembly, repairs, modernization, and lifting equipment. They offer a wide range of lifting solutions including slings, shackles, lifting eyes, and specialized lifting equipment under the WeDoLifting brand.",
    website: "wedolifting.se", 
    phone: "+46 431 43 24 20",
    email: "info@cranemech.com"
  },
  {
    name: "Crescocito AB",
    description: "Develops and manufactures components and complete turnkey solutions within industrial painting technology. They provide technical solutions and products for painting, corrosion protection, and other liquid applications. They offer everything from hand-held products to advanced robotized painting lines for industrial paint operations.",
    website: "crescocito.com",
    phone: "+46 (0)510 488 770", 
    email: "info@crescocito.com"
  },
  {
    name: "Dala Industri och Värmeservice AB",
    description: "The company provides general industrial services such as repairs, assembly, and maintenance of machinery and plants in the industry, as well as sales and installation of heating systems. They offer mechanical repairs, service of compressors, electrical installations, welding work, machining, and pipe installation.",
    website: "dalaindustri.se",
    phone: "+46 (0)23-35318"
  },
  {
    name: "Damaskus Maskinskydd AB", 
    description: "Supplies technical components and solutions for workplace safety and protections for machine tools. They manufacture, sell, and refurbish machine protective covers to customer specifications. They offer a complete range of mechanical protective components for machine tools with customer-specific solutions and short lead times.",
    website: "damaskus.se",
    phone: "+46 (0)8 556 505 20",
    email: "info@damaskus.se"
  },
  {
    name: "David Brown Santasalo Sweden AB",
    description: "Global experts in engineered mechanical power transmissions for all industries. They offer a wide range of gear couplings, industrial gearboxes, servicing, maintenance, repair and upgrade services for any industrial gearbox make or model.",
    website: "dbsantasalo.com",
    phone: "+46 31 710 20 50",
    email: "sweden@dbsantasalo.com"
  },
  {
    name: "Dematek AB - Trygga Lyft sedan 1919",
    description: "Sweden's most complete supplier of lifting equipment and lifting devices. They offer everything from small chain hoists, light load systems and swing cranes to large traverses and overhead cranes. Dematek develops, sells, services and installs products and solutions for lifting and handling large and small loads.",
    website: "dematek.se",
    phone: "010-202 35 00",
    email: "dematek@dematek.se"
  },
  {
    name: "Dendro Lift AB",
    description: "A leading Swedish manufacturer of advanced lifting equipment. Their lifting jacks are based on a screw drive for high performance, safety, and reliable operation. They offer over 50 years of expertise in safe, ergonomic lifting solutions for heavy vehicles and industry, including lifts, jack stands, train lifts, and special lifting solutions.",
    website: "dendrolift.com",
    phone: "+46 26-457 34 50",
    email: "info@dendrolift.com"
  },
  {
    name: "Dibo Produktionspartner AB",
    description: "A precision manufacturing company that produces advanced components in various materials. They are a subcontractor in the engineering industry offering everything from prototype to series production. They provide turning, milling, and assembly services with AS9100D certification and advanced CNC technology.",
    website: "dibo.se",
    phone: "070 682 99 20",
    email: "info@dibo.se"
  },
  {
    name: "DynaMate AB",
    description: "Develops and manufactures self-adjusting torque wrenches and associated equipment for wind power and industrial maintenance. They provide hydraulic bolt tensioning and torque tools for large diameter bolts, along with related service and support. Their products are designed for demanding applications in wind power, oil & gas, and heavy industry.",
    website: "dynamate.se",
    phone: "+46 (0)13 460 35 00",
    email: "info@dynamate.se"
  },
  {
    name: "Ravina AB",
    description: "Ravina AB specializes in repairs, new productions and conversions within industry. They work with machine tools and process equipment, both electrical and mechanical. The company provides industrial automation and robot integration services, as well as risk analysis and CE marking assistance. They work with leading control systems from Siemens, Heidenhain, Fanuc, Beckhoff and Mitsubishi.",
    website: "http://www.ravina.se/"
  },
  {
    name: "APG Industriservice AB", 
    description: "APG Industriservice AB provides industrial support services including maintenance, repairs, and installation of industrial machinery, electrical systems, pneumatics, and hydraulics. They offer troubleshooting, acute repairs, and preventive maintenance, as well as machine assembly, relocations, and modifications. They also provide welding and manufacturing services from their mechanical workshop or on-site, with expertise in automotive, food, plastics, paint, and graphic industries."
  },
  {
    name: "Jernbro Industrial Services AB",
    description: "Jernbro Industrial Services AB is Scandinavia's leading provider of industrial maintenance and projects. They help industries and owners of public infrastructure operate safer, more efficiently, and more sustainably through deep competence in maintenance and production facility development. They offer services like industrial maintenance, project management, automation, and chemical analysis, with a focus on improving customer operations and competitiveness.",
    website: "https://jernbro.com/en/"
  }
];

async function restoreAllAuthentic() {
  console.log("Restoring all authentic descriptions...");
  
  let updated = 0;
  
  for (const company of authenticDescriptions) {
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
  
  console.log(`\nRestored ${updated} authentic company descriptions`);
}

restoreAllAuthentic().catch(console.error);