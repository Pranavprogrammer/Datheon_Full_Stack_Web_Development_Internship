# ShopEase — E-Commerce Product Catalog & Interactive Shopping Cart

A responsive front-end storefront built for Task 4 using HTML, CSS, JavaScript and FakeStoreAPI.

## Features
- Fetches live product data from FakeStoreAPI.
- Responsive product cards with product images, prices, ratings, review counts and badges.
- Category filtering for Electronics, Jewelry, Men's Clothing and Women's Clothing.
- Live product search and sorting by price or rating.
- Slide-out cart with quantity increment/decrement, remove controls and navbar quantity badge.
- Cart persistence using `localStorage`.
- Automatic subtotal, estimated tax (5%), shipping and total calculations.
- Free shipping on demo orders of ₹5,000 or more.
- Checkout modal with basic required-field validation and demo order confirmation.
- Responsive layouts for desktop, tablet and mobile.

## Run locally
1. Extract the ZIP archive.
2. Open the `ecommerce_product_catalog` folder.
3. Open `index.html` in a browser. For best results, use VS Code with the **Live Server** extension.
4. An internet connection is required to fetch products from FakeStoreAPI.

## Project structure
```text
ecommerce_product_catalog/
├── index.html
├── README.md
├── css/
│   └── styles.css
└── js/
    └── app.js
```

## API and pricing note
API: https://fakestoreapi.com/products

FakeStoreAPI product prices are provided in USD. This demo multiplies those prices by 83.5 for an approximate INR display value; this is a fixed illustrative conversion, not a live exchange rate. Tax and shipping are demo rules and should be adjusted if your task brief specifies different values.

## Important
Checkout is simulated only. No real payment, order submission or customer data storage occurs. The name, email and address are used only to demonstrate the checkout flow in the current browser session.
