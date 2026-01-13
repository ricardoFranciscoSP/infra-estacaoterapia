-- CreateTable
CREATE TABLE "UserPermission" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "Module" "Module" NOT NULL,
    "Action" "ActionType" NOT NULL,
    "Allowed" BOOLEAN NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_UserId_Module_Action_key" ON "UserPermission"("UserId", "Module", "Action");

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

