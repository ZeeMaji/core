#include <oot/save.h>
#include <mm/save.h>
#include <string.h>
#include <strings.h>

extern OotSaveContext gSaveContext;
MmSaveContext gSaveContextMM;

void comboReadWriteFlash(u32 devAddr, void* dramAddr, u32 size, s32 direction);

static void copyName(u8* dst, const u8* src)
{
    u8 c0;
    u8 c1;

    for (int i = 0; i < 8; ++i)
    {
        c0 = src[i];
        if (c0 <= 0x09)
            c1 = c0;
        else if (c0 >= 0xab && c0 < 0xab + 26)
            c1 = c0 - 0xab + 0x0a;
        else if (c0 >= 0xc5 && c0 < 0xc5 + 26)
            c1 = c0 - 0xc5 + 0x24;
        else if (c0 == 0xe4)
            c1 = 0x3f;
        else if (c0 == 0xea)
            c1 = 0x40;
        else
            c1 = 0x3e;
        dst[i] = c1;
    }
}

static uint16_t comboComputeChecksum(void* data, int len)
{
    uint16_t checksum;
    uint8_t* p;

    checksum = 0;
    p = (uint8_t*)data;
    while (len > 0)
    {
        checksum += *p;
        ++p;
        len--;
    }
    return checksum;
}

void comboCreateSaveMM(void)
{
    MmSaveContext* s = &gSaveContextMM;
    bzero(s, sizeof(*s));

    /* Create some save data */
    s->save.entranceIndex = 0xd800;
    s->save.cutscene = 0;
    s->save.isFirstCycle = 1;
    s->save.hasTatl = 1;
    s->save.playerForm = 4;
    s->save.time = 0x3fff;
    s->save.playerData.health = 0x30;
    s->save.playerData.healthCapacity = 0x30;
    s->save.horseData.scene = 53;
    s->save.horseData.pos.x = -1420;
    s->save.horseData.pos.y = 257;
    s->save.horseData.pos.z = -1285;
    s->save.horseData.yaw = -0x7554;

    /* Set the magic */
    memcpy(s->save.playerData.newf, "ZELDA3", 6);

    /* Copy the player name */
    copyName(s->save.playerData.playerName, gSaveContext.playerName);

    /* Set the checksum */
    s->save.checksum = 0;
    s->save.checksum = comboComputeChecksum(&s->save, sizeof(s->save));

    /* Write the save data to flash */
    comboReadWriteFlash(0x0, s, sizeof(s->save), 1);
}
