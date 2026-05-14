import { Sequelize, DataTypes } from "sequelize";

// 从环境变量中读取数据库配置
const { MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_ADDRESS = "" } = process.env;

const [host, port] = MYSQL_ADDRESS.split(":");

const sequelize = new Sequelize("nodejs_demo", MYSQL_USERNAME, MYSQL_PASSWORD, {
  host,
  port,
  dialect: "mysql",
});

const CreditCard = sequelize.define(
  "CreditCard",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    owner_openid: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    bank_code: DataTypes.STRING(64),
    custom_bank_name: DataTypes.STRING(64),
    last4: DataTypes.STRING(8),
    bill_day: DataTypes.INTEGER,
    due_day: DataTypes.INTEGER,
    notes: {
      type: DataTypes.STRING(200),
      allowNull: false,
      defaultValue: "",
    },
    repaid_months: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    tableName: "credit_cards",
    underscored: false,
  }
);

const UserSetting = sequelize.define(
  "UserSetting",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    owner_openid: {
      type: DataTypes.STRING(191),
      allowNull: false,
      unique: true,
    },
    hideRepaid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    viewYm: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: "",
    },
  },
  {
    tableName: "user_settings",
    underscored: false,
  }
);

async function init() {
  await CreditCard.sync({ alter: true });
  await UserSetting.sync({ alter: true });
}

export { init, sequelize, CreditCard, UserSetting };
