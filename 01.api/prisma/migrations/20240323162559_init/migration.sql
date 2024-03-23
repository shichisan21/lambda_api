/*
  Warnings:

  - Added the required column `price` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "price" VARCHAR(255) NOT NULL;
