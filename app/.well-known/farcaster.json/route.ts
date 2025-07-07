export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_URL;
  const roomId = process.env.NEXT_PUBLIC_ROOM_ID;
  const imageUrl = process.env.NEXT_PUBLIC_IMAGE_URL;
  const logoUrl = process.env.NEXT_PUBLIC_LOGO;

  const config = {
    accountAssociation: {
      header:
        "eyJmaWQiOjY4NjEsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHhBNTkzMUE3MjZDRUNjYTA1N0EzRkY0M0E4NDg4MzQ2NjI2MDQ3OEI0In0",
      payload: "eyJkb21haW4iOiJ5YXB5YXAuc3BhY2UifQ",
      signature:
        "MHhiYWM1NzlkYjZlOTZiMDAxMmZjMTdhOWRiYjIzNzNkZTk3ODM0MGU4YmNhNGEyN2VjNWI4MjgxMTczZjk5NzYyMjRkNjYzMjg0YzU2MzZlMGYzZWFiMTY2OGQwMmExN2Q3MTdmMTM0YjE3YWExZjNkYjU0OTcyYTZlMTg3NjgyMjFi",
    },
    frame: {
      version: "1",
      name: "Zeero",
      iconUrl: `${logoUrl}`,
      homeUrl: `${appUrl}`,
      imageUrl: `${imageUrl}`,
      buttonTitle: "Start Creating",
      splashImageUrl: `${logoUrl}`,
      splashBackgroundColor: "#FFFFFF",
      webhookUrl: `${appUrl}/api/webhook`,
    },
  };

  return Response.json(config);
}
