const path = require("path");
require("dotenv").config({ path: path.join(process.cwd(), ".env") });
import IPoint from "../interfaces/Point";
import * as mongo from "mongodb";
import { ApiError } from "../errors/apiError";
import UserFacade from "./userFacadeWithDB";
import IPosition from "../interfaces/Position";
import IPost from "../interfaces/Post";
import { positionCreator } from "../utils/geoUtils";
import {
  POSITION_COLLECTION_NAME,
  POST_COLLECTION_NAME,
} from "../config/collectionNames";

let positionCollection: mongo.Collection;
let postCollection: mongo.Collection;
const EXPIRES_AFTER = 30;

export default class GameFacade {
  static readonly DIST_TO_CENTER = 15;

  static async setDatabase(client: mongo.MongoClient) {
    const dbName = process.env.DB_NAME;
    if (!dbName) {
      throw new Error("Database name not provided");
    }
    //This facade uses the UserFacade, so set it up with the right client
    await UserFacade.setDatabase(client);

    try {
      if (!client.isConnected()) {
        await client.connect();
      }
      positionCollection = client
        .db(dbName)
        .collection(POSITION_COLLECTION_NAME);
      await positionCollection.createIndex({ location: "2dsphere" });
      postCollection = client.db(dbName).collection(POST_COLLECTION_NAME);
      await postCollection.createIndex({ location: "2dsphere" });
      return client.db(dbName);
    } catch (err) {
      console.error("Could not connect", err);
    }
  }

  static async nearbyPlayers(
    userName: string,
    password: string,
    longitude: number,
    latitude: number,
    distance: number
  ) {
    let user;
    try {
      //Step-1. Find the user, and if found continue
      user = await UserFacade.getUser(userName);
      const loggedIn = await UserFacade.checkUser(userName, password);
    } catch (err) {
      throw new ApiError("wrong username or password", 403);
    }

    try {
      const point = { type: "Point", coordinates: [longitude, latitude] };
      const date = new Date();
      /*It's important you know what to do her. Remember a document for this user does
      not neccesarily exist. If not, you must create it, in not found (see what you can do wit upsert)
      Also remember to set a new timeStamp (use the date create above), since this document should only live for a
      short time */
      const found = await positionCollection.findOneAndUpdate(
        { userName },
        {
          $set: {
            userName,
            name: user.name,
            lastUpdated: date,
            location: point,
          },
        }, // Add what needs to be added here, remember the document might NOT exist yet
        { upsert: true, returnOriginal: false }
      );

      const nearbyPlayers = await GameFacade.findNearbyPlayers(
        userName,
        point,
        distance
      );

      //If anyone found,  format acording to requirements
      const formatted = nearbyPlayers.map((player) => {
        return {
          userName: player.userName,
          name: player.name,
          lat: latitude,
          lon: longitude,
        };
      });
      return formatted;
    } catch (err) {
      throw err;
    }
  }
  static async findNearbyPlayers(
    clientUserName: string,
    point: IPoint,
    distance: number
  ): Promise<Array<IPosition>> {
    try {
      const location = {
        $near: {
          $geometry: point,
          $maxDistance: distance,
        },
      };
      const found = await positionCollection.find({
        userName: { $ne: clientUserName },
        location,
      });
      return found.toArray();
    } catch (err) {
      throw err;
    }
  }

  static async getPostIfReached(
    postId: string,
    lat: number,
    lon: number
  ): Promise<any> {
    const point = { type: "Point", coordinates: [lon, lat] };
    const distance = 10;
    try {
      const post: IPost | null = await postCollection.findOne({
        _id: postId,
        location: {
          $near: {
            $geometry: point,
            $maxDistance: distance,
          },
        },
      });
      if (post === null) {
        throw new ApiError("Post not reached", 400);
      }
      return { postId: post._id, task: post.task.text, isUrl: post.task.isUrl };
    } catch (err) {
      throw err;
    }
  }

  //You can use this if you like, to add new post's via the facade
  static async addPost(
    name: string,
    taskTxt: string,
    isURL: boolean,
    taskSolution: string,
    lon: number,
    lat: number
  ): Promise<IPost> {
    const position = { type: "Point", coordinates: [lon, lat] };
    const status = await postCollection.insertOne({
      _id: name,
      task: { text: taskTxt, isURL },
      taskSolution,
      location: {
        type: "Point",
        coordinates: [lon, lat],
      },
    });
    const newPost: any = status.ops;
    return newPost as IPost;
  }

  static async updatePosition(
    userName: string,
    lon: number,
    lat: number
  ): Promise<any> {
    try {
      const found = await positionCollection.findOneAndUpdate(
        { userName },
        {
          $set: {
            lastUpdated: new Date(),
            userName,
            location: { type: "Point", coordinates: [lon, lat] },
          },
        },
        { upsert: true, returnOriginal: false }
      );
      if (found === null) {
        throw new ApiError("Booi where u at", 400);
      }
      const formatted: IPosition = {
        lastUpdated: found.value.lastUpdated,
        userName: found.value.userName,
        name: found.value.name,
        location: found.value.location,
      };
      return formatted;
    } catch (err) {
      throw err;
    }
  }
}
