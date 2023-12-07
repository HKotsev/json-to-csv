const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs").promises;
const path = require("path");
const config = require("./config.json");

const directoryPath = path.join(__dirname, config.jsonFiles);
const csvFilesPath = path.join(__dirname, config.csvFiles);

const readJsonFilesInDir = async () => {
  try {
    const files = await fs.readdir(directoryPath);
    const jsonFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === ".json"
    );

    for (const file of jsonFiles) {
      const data = await fs.readFile(path.join(directoryPath, file), "utf-8");
      await processJsonFile(file, data);
    }
  } catch (err) {
    console.error("Error reading directory:", err);
  }
};

const processJsonFile = async (file, data) => {
  try {
    const refactoredProducts = [];
    const parsedProducts = JSON.parse(data).records;

    const currencies = [
      ...new Set(parsedProducts.map((record) => record.CurrencyIsoCode)),
    ];

    parsedProducts.forEach((product) => {
      const matchingProduct = refactoredProducts.find(
        (record) =>
          record["Product StockKeepingUnit"] ===
          product.Product2.Article_SAP_Code__c
      );

      if (!matchingProduct) {
        const productCard = {
          "Product StockKeepingUnit": product.Product2.Article_SAP_Code__c,
        };

        currencies.forEach((currency) => {
          productCard[`Price (${product.Pricebook2Id}) ${currency}`] =
            product.CurrencyIsoCode === currency ? product.UnitPrice : "";
        });
        (productCard.isActive = product.IsActive),
          refactoredProducts.push(productCard);
      } else {
        matchingProduct[
          `Price (${product.Pricebook2Id}) ${product.CurrencyIsoCode}`
        ] = product.UnitPrice;
      }
    });

    await convertToCSV(file, refactoredProducts);
  } catch (err) {
    console.error(`Error processing ${file}:`, err);
  }
};

const convertToCSV = async (file, productsData) => {
  const csvWriter = createCsvWriter({
    path: path.join(csvFilesPath, file.replace(".json", ".csv")),
    header: Object.keys(productsData[0]).map((key) => ({
      id: key,
      title: key,
    })),
  });

  try {
    await csvWriter.writeRecords(productsData);
    console.log(
      `CSV file ${file.replace(".json", ".csv")} has been written successfully`
    );
  } catch (err) {
    console.error("Error writing CSV file:", err);
  }
};

readJsonFilesInDir();
