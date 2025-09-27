import { db } from "../server/db.js";
import { companies } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import fs from 'fs';

const authenticCompanies = [
  {
    name: "Constructor Sverige AB",
    description: "Constructor is a leading supplier of warehouse fixtures and logistics solutions in Sweden. They help customers through the entire process from planning to installation, service, inspection, and support. They offer advanced innovative storage solutions and are part of Gonvarri Material Handling."
  },
  {
    name: "Cranemech AB", 
    description: "An industrial company in the lifting industry with experience in service, assembly, repairs, modernization, and lifting equipment. They offer a wide range of lifting solutions including slings, shackles, lifting eyes, and specialized lifting equipment under the WeDoLifting brand."
  },
  {
    name: "Crescocito AB",
    description: "Develops and manufactures components and complete turnkey solutions within industrial painting technology. They provide technical solutions and products for painting, corrosion protection, and other liquid applications. They offer everything from hand-held products to advanced robotized painting lines for industrial paint operations."
  },
  {
    name: "Dala Industri och Värmeservice AB",
    description: "The company provides general industrial services such as repairs, assembly, and maintenance of machinery and plants in the industry, as well as sales and installation of heating systems. They offer mechanical repairs, service of compressors, electrical installations, welding work, machining, and pipe installation."
  },
  {
    name: "Damaskus Maskinskydd AB",
    description: "Supplies technical components and solutions for workplace safety and protections for machine tools. They manufacture, sell, and refurbish machine protective covers to customer specifications. They offer a complete range of mechanical protective components for machine tools with customer-specific solutions and short lead times."
  },
  {
    name: "David Brown Santasalo Sweden AB",
    description: "Global experts in engineered mechanical power transmissions for all industries. They offer a wide range of gear couplings, industrial gearboxes, servicing, maintenance, repair and upgrade services for any industrial gearbox make or model."
  },
  {
    name: "Dematek AB - Trygga Lyft sedan 1919",
    description: "Sweden's most complete supplier of lifting equipment and lifting devices. They offer everything from small chain hoists, light load systems and swing cranes to large traverses and overhead cranes. Dematek develops, sells, services and installs products and solutions for lifting and handling large and small loads."
  },
  {
    name: "Dendro Lift AB",
    description: "A leading Swedish manufacturer of advanced lifting equipment. Their lifting jacks are based on a screw drive for high performance, safety, and reliable operation. They offer over 50 years of expertise in safe, ergonomic lifting solutions for heavy vehicles and industry, including lifts, jack stands, train lifts, and special lifting solutions."
  },
  {
    name: "Dibo Produktionspartner AB",
    description: "A precision manufacturing company that produces advanced components in various materials. They are a subcontractor in the engineering industry offering everything from prototype to series production. They provide turning, milling, and assembly services with AS9100D certification and advanced CNC technology."
  },
  {
    name: "Ravina AB",
    description: "Ravina AB specializes in repairs, new productions and conversions within industry. They work with machine tools and process equipment, both electrical and mechanical. The company provides industrial automation and robot integration services, as well as risk analysis and CE marking assistance. They work with leading control systems from Siemens, Heidenhain, Fanuc, Beckhoff and Mitsubishi."
  },
  {
    name: "Junic AB",
    description: "Junic AB is a staffing and recruitment company that specializes in providing skilled personnel and career opportunities. They offer customized recruitment and staffing solutions for companies as well as exciting job opportunities for individuals. The company focuses on staffing, recruitment and TSL transformation for both collective employees and white-collar workers."
  }
];

async function batchRestoreDescriptions() {
  console.log("Batch restoring authentic descriptions...");
  
  let restoredCount = 0;
  
  for (const companyData of authenticCompanies) {
    const existingCompany = await db
      .select()
      .from(companies)
      .where(eq(companies.name, companyData.name))
      .limit(1);
    
    if (existingCompany.length > 0) {
      await db
        .update(companies)
        .set({ description: companyData.description })
        .where(eq(companies.id, existingCompany[0].id));
      
      restoredCount++;
      console.log(`Restored: ${companyData.name}`);
    }
  }
  
  console.log(`Total authentic descriptions restored: ${restoredCount}`);
}

batchRestoreDescriptions().catch(console.error);