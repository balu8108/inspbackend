const {DataTypes}=require('sequelize');
const sequelize=require("../config/databaseConnection").sequelize;
const Meeting =sequelize.define('Meeting', {
    id: {
        type : DataTypes.INTEGER,
        primaryKey: true , 
        autoIncrement:true
    },
    date:{
        type:DataTypes.DATEONLY,
        allowNull:false
    },
    time: {
        type:DataTypes.TIME,
        allowNull:false
    },
    title:{
        type:DataTypes.STRING,
        allowNull:false
    },
    description:{
        type:DataTypes.TEXT
    },
    meetingUrl:{
        type:DataTypes.STRING,
        allowNull:false
    }


})
module.exports=Meeting;