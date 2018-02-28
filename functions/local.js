const admin = require("firebase-admin");

exports.getProducts = () => {
  return admin
    .firestore()
    .collection("products")
    .get()
    .then(snapshot => {
      const products = [];
      snapshot.forEach(doc => {
        products.push(doc.data());
      });
      //return products;
      return [
        {
          id: 1,
          isActive: true,
          etsyId: 1,
          etsyPrice: 12.99,
          amazonId: "B07175BDZS",
          profit: 5
        }
      ];
    });
};

exports.updateProduct = (id, data) => {
  return admin
    .firestore()
    .collection("products")
    .doc(id)
    .set(data);
};

exports.addProduct = data => {
  return admin
    .firestore()
    .collection("products")
    .add(data);
};

exports.deleteProduct = id => {
  return db
    .collection("products")
    .doc(id)
    .delete();
};
