"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
    class StudentFeedback extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }
    StudentFeedback.init(
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true // Assuming your id is auto-incrementing
            },
            studentName: DataTypes.STRING,
            studentEmail: DataTypes.STRING,
            feedback: DataTypes.TEXT,
        },
        {
            sequelize,
            modelName: "StudentFeedback",
        }
    );
    return StudentFeedback;
};
