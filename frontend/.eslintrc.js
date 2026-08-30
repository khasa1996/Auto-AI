module.exports = {
  overrides: [
    {
      files: [
        "src/components/InstallPWA.jsx",
        "src/pages/About.jsx",
        "src/pages/Admin.jsx",
        "src/pages/BookCar.jsx",
        "src/pages/Cars.jsx",
        "src/pages/Compare.jsx",
        "src/pages/Dealer.jsx",
        "src/pages/DealerApply.jsx",
        "src/pages/EMI.jsx",
        "src/pages/Home.jsx",
        "src/pages/Login.jsx",
        "src/pages/MyBookings.jsx",
        "src/pages/News.jsx",
        "src/pages/Premium.jsx",
        "src/pages/Recommend.jsx",
      ],
      rules: {
        "react/jsx-no-comment-textnodes": "off",
      },
    },
    {
      files: [
        "src/components/ChatDrawer.jsx",
        "src/pages/Admin.jsx",
        "src/pages/BookCar.jsx",
      ],
      rules: {
        "no-unused-vars": "off",
      },
    },
    {
      files: ["src/components/Footer.jsx"],
      rules: {
        "jsx-a11y/anchor-is-valid": "off",
      },
    },
  ],
};
