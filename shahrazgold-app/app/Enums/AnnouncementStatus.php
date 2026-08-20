<?php

namespace App\Enums;

enum AnnouncementStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
}
