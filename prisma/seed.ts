import { prisma } from "@/lib/db/prisma";
import { syncBuiltInTests } from "@/lib/meta/catalog";

async function main() {
  await syncBuiltInTests();

  const favoriteExists = await prisma.favoritePack.findFirst({
    where: { name: "Starter Review Pack" }
  });

  if (!favoriteExists) {
    await prisma.favoritePack.create({
      data: {
        name: "Starter Review Pack",
        description: "Recommended first-run suite for common Meta App Review scenarios.",
        testKeys: [
          "get_user_permissions",
          "get_pages_via_me_accounts",
          "get_page_details",
          "get_page_instagram_business_account",
          "get_ig_user_basic_profile",
          "get_ig_media_list"
        ]
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
